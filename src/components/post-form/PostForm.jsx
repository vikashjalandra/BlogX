import React, { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Input, Select, RTE } from '../index'
import service from '../../appwrite/config'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { GoogleGenerativeAI } from '@google/generative-ai'
import conf from '../../conf/Conf'


function PostForm({ post }) {
  const [title, setTitle] = useState('')
  
  const [aiContent,setAiContent] = useState('')
  
  const GenAI = new GoogleGenerativeAI(conf.geminiApiKey)
  const model = GenAI.getGenerativeModel({
    model:"gemini-1.5-flash"
  })
  
  const generateContent =async()=>{
    if(title){
      const res = await model.generateContent(title)
      const content = res.response.text()
      console.log(res.response);
      setAiContent(content)
    } else if (!title) {
      alert("Enter title to generate")
    }
  }

  const { register, handleSubmit, watch, setValue, control, getValues } = useForm({
    defaultValues: {
      title: post?.title || '',
      slug: post?.$id || '',
      content: post?.content || '',
      status: post?.status || 'active'
    }
  })

  const navigate = useNavigate()
  const userData = useSelector((state) =>{
    return state.auth.userData
  })


  const submit = async (data) => {
    if (post) {

      const file = data.image[0] ? await service.uploadFile(data.image[0]) : null

      if (file) {
        service.deleteFile(post.featuredImage)
      }
      const dbPost = await service.updatePost(post.$id, {
        ...data,
        featuredImage: file ? file.$id : undefined
      })

      if (dbPost) {
        navigate(`/post/${dbPost.$id}`)
      }
    } else {
      const file = await service.uploadFile(data.image[0])
      
      if (file) {
        
        const fileId = file.$id
        data.featuredImage = fileId
        const dbPost = await service.createPost({
          ...data,
          userid: userData.$id
        })
        if (dbPost) {
          navigate(`/post/${dbPost.$id}`)
        }
      }
    }




  }

  const slugTransform = useCallback((value) => {
    if (value && typeof value === 'string') {
      return value
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z\d\s]+/g, "-")
        .replace(/\s/g, "-");

    }
    return ''
  }, [])

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'title') {
        setValue('slug', slugTransform(value.title), { shouldValidate: true })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [watch, slugTransform, setValue])

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-wrap">
      <div className="w-2/3 px-2">
        <Input
          label="Title :"
          placeholder="Title"
         onInput={(e) => setTitle(e.target.value)}
          className="mb-4 border border-gray-700 rounded-none"
          {...register("title", { required: true })}
        />
        <Input
          label="Slug :"
          placeholder="Slug"
          className="mb-4 border border-gray-700 rounded-none"
          {...register("slug", { required: true })}
          onInput={(e) => {
            setValue("slug", slugTransform(e.currentTarget.value), { shouldValidate: true });
          }}
        />
        <RTE label="Content :" name="content" initialValue={aiContent} control={control} defaultValue={getValues("content")} />
      </div>
      <div className="w-1/3 px-2">
        <Input
          label="Featured Image :"
          type="file"
          className="mb-4 border border-gray-700 rounded-none"
          accept="image/png, image/jpg, image/jpeg, image/gif"
          {...register("image", { required: !post })}
        />
        {post && (
          <div className="w-full mb-4">
            <img
              src={service.getFilePreview(post.featuredImage)}
              alt={post.title}
              className="border border-gray-700 rounded-none"
            />
          </div>
        )}
        <Select
          options={["active", "inactive"]}
          label="Status"
          className="mb-4 border border-gray-700 rounded-none"
          {...register("status", { required: true })}
        />
        <Button onClick={generateContent} bgColor="bg-black" className="w-full hover:bg-gray-800 rounded-none">
          Generate Using AI
        </Button>
        <Button type="submit" bgColor="bg-black" className="w-full hover:bg-gray-800 rounded-none mt-2">
          {post ? "Update" : "Submit"}
        </Button>
      </div>
    </form>
  )
}

export default PostForm
